  
<?php
use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;


/**
 * @ORM\Entity 
 * @ORM\Table(name="organizations")
 */
class Organization
{
    /** @ORM\Id 
     * @ORM\Column(type="integer") 
     * @ORM\GeneratedValue */
    protected $id;

    /** @ORM\Column(type="string") */
    protected $name;

    /** @ORM\Column(type="boolean") */
    protected $visible;

    /**
     * @ORM\OneToMany(targetEntity="OrgACL", mappedBy="organization")
     */
    protected $orgAcls;

    /**
     * @ORM\OneToMany(targetEntity="MemberRole", mappedBy="organization")
     */
    protected $memberRoles;

    /**
     * @ORM\OneToMany(targetEntity="Role", mappedBy="organization")
     */
    protected $roles;

    // /** @ORM\Column(type="boolean") */
    // protected $projects;

    public function __construct() {
        $this->orgAcls = new ArrayCollection();
        $this->memberRoles = new ArrayCollection();
        $this->roles = new ArrayCollection();

        

    }



    public function getId()
    {
        return $this->id;
    }

    public function getName()
    {
        return $this->name;
    }

    public function setName($name)
    {
        $this->name = $name;
    }

    public function setVisible($visible)
    {
        $this->visible = $visible;
    }

    public function addOrgACL($acl)
    {
        $this->orgAcls->add($acl);
    }

    public function addMemberRole($memberRole)
    {
        $this->memberRoles->add($memberRole);
    }

}
