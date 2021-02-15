  
<?php
use Doctrine\ORM\Mapping as ORM;
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
     * Many Users have Many Groups.
     * @ManyToMany(targetEntity="User", inversedBy="members")
     * @JoinTable(name="users_orgs")
     */
    protected $memberRoles;

    /** @ORM\Column(type="boolean") */
    protected $projects;



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
}
