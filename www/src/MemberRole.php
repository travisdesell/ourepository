  
<?php
use Doctrine\ORM\Mapping as ORM;
/**
 * @ORM\Entity 
 * @ORM\Table(name="mem_roles")
 */
class MemberRole
{
    /** @ORM\Id 
    * @ORM\Column(type="integer") 
     * @ORM\GeneratedValue */

    protected $id;

    /**
     * Many features have one product. This is the owning side.
     * @ORM\ManyToOne(targetEntity="User")
     */
    protected $member;


    /**
     * Many features have one product. This is the owning side.
     * @ORM\ManyToOne(targetEntity="Organization")
     */
    protected $organization;


    /** @ORM\Column(type="string") */
    protected $name;



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

    public function setMember($member)
    {
        $this->member = $member;
    }

    public function setOrganization($organization)
    {
        $this->organization = $organization;
    }
}
