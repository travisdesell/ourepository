  
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

    /** @ORM\Column(type="boolean") */
    protected $member;

    /** @ORM\Column(type="boolean") */
    protected $organization;

    /** @ORM\Column(type="boolean") */
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
}
